package main

import (
	"context"
	"log/slog"

	"connectrpc.com/connect"
	"github.com/urfave/cli/v3"
	authv1 "github.com/wargasipil/facego/gen/auth/v1"
	usersv1 "github.com/wargasipil/facego/gen/users/v1"
	"github.com/wargasipil/facego/internal/services/auth_service"
	"github.com/wargasipil/facego/internal/services/user_service"
)

// seedAccounts lists staff accounts to ensure exist.
var seedAccounts = []struct {
	username    string
	displayName string
	password    string
	role        authv1.Role
}{
	{"admin", "Administrator", "admin123", authv1.Role_ROLE_ADMIN},
	{"teacher01", "Budi Santoso", "teacher123", authv1.Role_ROLE_TEACHER},
	{"teacher02", "Ratna Wulandari", "teacher123", authv1.Role_ROLE_TEACHER},
	{"operator01", "Sari Dewi", "operator123", authv1.Role_ROLE_OPERATOR},
}

// seedStudents lists 100 sample students to ensure exist.
var seedStudents = []struct {
	studentID   string
	name        string
	email       string
	parentName  string
	parentPhone string
	parentEmail string
}{
	{"STU001", "Andi Prasetyo", "andi.prasetyo@student.sch.id", "Hendra Prasetyo", "+62 812 1111 0001", "hendra.prasetyo@gmail.com"},
	{"STU002", "Dewi Rahayu", "dewi.rahayu@student.sch.id", "Slamet Rahayu", "+62 812 1111 0002", "slamet.rahayu@gmail.com"},
	{"STU003", "Fajar Nugroho", "fajar.nugroho@student.sch.id", "Agus Nugroho", "+62 812 1111 0003", "agus.nugroho@gmail.com"},
	{"STU004", "Siti Aminah", "siti.aminah@student.sch.id", "Wahyu Aminah", "+62 812 1111 0004", "wahyu.aminah@gmail.com"},
	{"STU005", "Rizky Firmansyah", "rizky.firmansyah@student.sch.id", "Bambang Firmansyah", "+62 812 1111 0005", "bambang.firmansyah@gmail.com"},
	{"STU006", "Nur Fadilah", "nur.fadilah@student.sch.id", "Mulyono Fadilah", "+62 812 1111 0006", "mulyono.fadilah@gmail.com"},
	{"STU007", "Bagas Wicaksono", "bagas.wicaksono@student.sch.id", "Eko Wicaksono", "+62 812 1111 0007", "eko.wicaksono@gmail.com"},
	{"STU008", "Citra Lestari", "citra.lestari@student.sch.id", "Joko Lestari", "+62 812 1111 0008", "joko.lestari@gmail.com"},
	{"STU009", "Dimas Aditya", "dimas.aditya@student.sch.id", "Surya Aditya", "+62 812 1111 0009", "surya.aditya@gmail.com"},
	{"STU010", "Elisa Permata", "elisa.permata@student.sch.id", "Gunawan Permata", "+62 812 1111 0010", "gunawan.permata@gmail.com"},
	{"STU011", "Fauzan Hidayat", "fauzan.hidayat@student.sch.id", "Yusuf Hidayat", "+62 812 1111 0011", "yusuf.hidayat@gmail.com"},
	{"STU012", "Galih Saputra", "galih.saputra@student.sch.id", "Teguh Saputra", "+62 812 1111 0012", "teguh.saputra@gmail.com"},
	{"STU013", "Hana Kusuma", "hana.kusuma@student.sch.id", "Dodik Kusuma", "+62 812 1111 0013", "dodik.kusuma@gmail.com"},
	{"STU014", "Irfan Maulana", "irfan.maulana@student.sch.id", "Rudi Maulana", "+62 812 1111 0014", "rudi.maulana@gmail.com"},
	{"STU015", "Jasmine Putri", "jasmine.putri@student.sch.id", "Anton Putri", "+62 812 1111 0015", "anton.putri@gmail.com"},
	{"STU016", "Kevin Santoso", "kevin.santoso@student.sch.id", "Hari Santoso", "+62 812 1111 0016", "hari.santoso@gmail.com"},
	{"STU017", "Laras Setiawan", "laras.setiawan@student.sch.id", "Dadang Setiawan", "+62 812 1111 0017", "dadang.setiawan@gmail.com"},
	{"STU018", "Maulana Ibrahim", "maulana.ibrahim@student.sch.id", "Soleh Ibrahim", "+62 812 1111 0018", "soleh.ibrahim@gmail.com"},
	{"STU019", "Nabila Azzahra", "nabila.azzahra@student.sch.id", "Farid Azzahra", "+62 812 1111 0019", "farid.azzahra@gmail.com"},
	{"STU020", "Oscar Wijaya", "oscar.wijaya@student.sch.id", "Tono Wijaya", "+62 812 1111 0020", "tono.wijaya@gmail.com"},
	{"STU021", "Putri Handayani", "putri.handayani@student.sch.id", "Haryono Handayani", "+62 812 1111 0021", "haryono.handayani@gmail.com"},
	{"STU022", "Qori Ananda", "qori.ananda@student.sch.id", "Wahid Ananda", "+62 812 1111 0022", "wahid.ananda@gmail.com"},
	{"STU023", "Rafi Hakim", "rafi.hakim@student.sch.id", "Ismail Hakim", "+62 812 1111 0023", "ismail.hakim@gmail.com"},
	{"STU024", "Salma Nuraini", "salma.nuraini@student.sch.id", "Zulkifli Nuraini", "+62 812 1111 0024", "zulkifli.nuraini@gmail.com"},
	{"STU025", "Taufik Hidayat", "taufik.hidayat@student.sch.id", "Syamsul Hidayat", "+62 812 1111 0025", "syamsul.hidayat@gmail.com"},
	{"STU026", "Ulfa Maharani", "ulfa.maharani@student.sch.id", "Sutrisno Maharani", "+62 812 1111 0026", "sutrisno.maharani@gmail.com"},
	{"STU027", "Vino Ardiansyah", "vino.ardiansyah@student.sch.id", "Darmawan Ardiansyah", "+62 812 1111 0027", "darmawan.ardiansyah@gmail.com"},
	{"STU028", "Wulan Sari", "wulan.sari@student.sch.id", "Purwanto Sari", "+62 812 1111 0028", "purwanto.sari@gmail.com"},
	{"STU029", "Xenia Natalia", "xenia.natalia@student.sch.id", "Freddy Natalia", "+62 812 1111 0029", "freddy.natalia@gmail.com"},
	{"STU030", "Yoga Pratama", "yoga.pratama@student.sch.id", "Suwito Pratama", "+62 812 1111 0030", "suwito.pratama@gmail.com"},
	{"STU031", "Zahra Aulia", "zahra.aulia@student.sch.id", "Munir Aulia", "+62 812 1111 0031", "munir.aulia@gmail.com"},
	{"STU032", "Arif Budianto", "arif.budianto@student.sch.id", "Hartono Budianto", "+62 812 1111 0032", "hartono.budianto@gmail.com"},
	{"STU033", "Bella Anggraini", "bella.anggraini@student.sch.id", "Widodo Anggraini", "+62 812 1111 0033", "widodo.anggraini@gmail.com"},
	{"STU034", "Candra Wijayanto", "candra.wijayanto@student.sch.id", "Suparman Wijayanto", "+62 812 1111 0034", "suparman.wijayanto@gmail.com"},
	{"STU035", "Diana Safitri", "diana.safitri@student.sch.id", "Katiman Safitri", "+62 812 1111 0035", "katiman.safitri@gmail.com"},
	{"STU036", "Egi Kurniawan", "egi.kurniawan@student.sch.id", "Rusman Kurniawan", "+62 812 1111 0036", "rusman.kurniawan@gmail.com"},
	{"STU037", "Fitria Ramadhani", "fitria.ramadhani@student.sch.id", "Asep Ramadhani", "+62 812 1111 0037", "asep.ramadhani@gmail.com"},
	{"STU038", "Gilang Ramadhan", "gilang.ramadhan@student.sch.id", "Dadang Ramadhan", "+62 812 1111 0038", "dadang.ramadhan@gmail.com"},
	{"STU039", "Hayati Nufus", "hayati.nufus@student.sch.id", "Fauzi Nufus", "+62 812 1111 0039", "fauzi.nufus@gmail.com"},
	{"STU040", "Ilham Bachtiar", "ilham.bachtiar@student.sch.id", "Darmadi Bachtiar", "+62 812 1111 0040", "darmadi.bachtiar@gmail.com"},
	{"STU041", "Jihan Fauziah", "jihan.fauziah@student.sch.id", "Lutfi Fauziah", "+62 812 1111 0041", "lutfi.fauziah@gmail.com"},
	{"STU042", "Krisna Bayu", "krisna.bayu@student.sch.id", "Wibowo Bayu", "+62 812 1111 0042", "wibowo.bayu@gmail.com"},
	{"STU043", "Latifah Hanum", "latifah.hanum@student.sch.id", "Arifin Hanum", "+62 812 1111 0043", "arifin.hanum@gmail.com"},
	{"STU044", "Muhamad Iqbal", "muhamad.iqbal@student.sch.id", "Agung Iqbal", "+62 812 1111 0044", "agung.iqbal@gmail.com"},
	{"STU045", "Nadya Puspita", "nadya.puspita@student.sch.id", "Sugiono Puspita", "+62 812 1111 0045", "sugiono.puspita@gmail.com"},
	{"STU046", "Okta Ferdiansyah", "okta.ferdiansyah@student.sch.id", "Supardi Ferdiansyah", "+62 812 1111 0046", "supardi.ferdiansyah@gmail.com"},
	{"STU047", "Paramita Sari", "paramita.sari@student.sch.id", "Basuki Sari", "+62 812 1111 0047", "basuki.sari@gmail.com"},
	{"STU048", "Quincy Putra", "quincy.putra@student.sch.id", "Marwan Putra", "+62 812 1111 0048", "marwan.putra@gmail.com"},
	{"STU049", "Restu Permadi", "restu.permadi@student.sch.id", "Samsuri Permadi", "+62 812 1111 0049", "samsuri.permadi@gmail.com"},
	{"STU050", "Suci Indah", "suci.indah@student.sch.id", "Priyo Indah", "+62 812 1111 0050", "priyo.indah@gmail.com"},
	{"STU051", "Tegar Prabowo", "tegar.prabowo@student.sch.id", "Kuncoro Prabowo", "+62 812 1111 0051", "kuncoro.prabowo@gmail.com"},
	{"STU052", "Umi Kalsum", "umi.kalsum@student.sch.id", "Rohmat Kalsum", "+62 812 1111 0052", "rohmat.kalsum@gmail.com"},
	{"STU053", "Valentino Hadi", "valentino.hadi@student.sch.id", "Soegeng Hadi", "+62 812 1111 0053", "soegeng.hadi@gmail.com"},
	{"STU054", "Wahyu Setiabudi", "wahyu.setiabudi@student.sch.id", "Nugroho Setiabudi", "+62 812 1111 0054", "nugroho.setiabudi@gmail.com"},
	{"STU055", "Xiomara Dewanti", "xiomara.dewanti@student.sch.id", "Paijo Dewanti", "+62 812 1111 0055", "paijo.dewanti@gmail.com"},
	{"STU056", "Yanti Kusumawati", "yanti.kusumawati@student.sch.id", "Suroto Kusumawati", "+62 812 1111 0056", "suroto.kusumawati@gmail.com"},
	{"STU057", "Zulfa Khoiriyah", "zulfa.khoiriyah@student.sch.id", "Mashudi Khoiriyah", "+62 812 1111 0057", "mashudi.khoiriyah@gmail.com"},
	{"STU058", "Aldy Nugraha", "aldy.nugraha@student.sch.id", "Wahyudi Nugraha", "+62 812 1111 0058", "wahyudi.nugraha@gmail.com"},
	{"STU059", "Bintang Erlangga", "bintang.erlangga@student.sch.id", "Suharto Erlangga", "+62 812 1111 0059", "suharto.erlangga@gmail.com"},
	{"STU060", "Cantika Maharani", "cantika.maharani@student.sch.id", "Teguh Maharani", "+62 812 1111 0060", "teguh.maharani@gmail.com"},
	{"STU061", "Damar Prayoga", "damar.prayoga@student.sch.id", "Warno Prayoga", "+62 812 1111 0061", "warno.prayoga@gmail.com"},
	{"STU062", "Erna Fitriani", "erna.fitriani@student.sch.id", "Sudi Fitriani", "+62 812 1111 0062", "sudi.fitriani@gmail.com"},
	{"STU063", "Farel Pradipta", "farel.pradipta@student.sch.id", "Prayitno Pradipta", "+62 812 1111 0063", "prayitno.pradipta@gmail.com"},
	{"STU064", "Gita Noviani", "gita.noviani@student.sch.id", "Markus Noviani", "+62 812 1111 0064", "markus.noviani@gmail.com"},
	{"STU065", "Hafiz Ramadhan", "hafiz.ramadhan@student.sch.id", "Sunarto Ramadhan", "+62 812 1111 0065", "sunarto.ramadhan@gmail.com"},
	{"STU066", "Indira Cahyani", "indira.cahyani@student.sch.id", "Suyono Cahyani", "+62 812 1111 0066", "suyono.cahyani@gmail.com"},
	{"STU067", "Juniar Pratiwi", "juniar.pratiwi@student.sch.id", "Darno Pratiwi", "+62 812 1111 0067", "darno.pratiwi@gmail.com"},
	{"STU068", "Khoirul Umam", "khoirul.umam@student.sch.id", "Sarjono Umam", "+62 812 1111 0068", "sarjono.umam@gmail.com"},
	{"STU069", "Liana Anggraeni", "liana.anggraeni@student.sch.id", "Bambang Anggraeni", "+62 812 1111 0069", "bambang.anggraeni@gmail.com"},
	{"STU070", "Miko Aryo", "miko.aryo@student.sch.id", "Djoko Aryo", "+62 812 1111 0070", "djoko.aryo@gmail.com"},
	{"STU071", "Nadia Oktaviani", "nadia.oktaviani@student.sch.id", "Supeno Oktaviani", "+62 812 1111 0071", "supeno.oktaviani@gmail.com"},
	{"STU072", "Oky Fauzan", "oky.fauzan@student.sch.id", "Maryadi Fauzan", "+62 812 1111 0072", "maryadi.fauzan@gmail.com"},
	{"STU073", "Priya Kusuma", "priya.kusuma@student.sch.id", "Tohari Kusuma", "+62 812 1111 0073", "tohari.kusuma@gmail.com"},
	{"STU074", "Qisthi Salma", "qisthi.salma@student.sch.id", "Hamdan Salma", "+62 812 1111 0074", "hamdan.salma@gmail.com"},
	{"STU075", "Rendy Alfian", "rendy.alfian@student.sch.id", "Kasiman Alfian", "+62 812 1111 0075", "kasiman.alfian@gmail.com"},
	{"STU076", "Selfiana Putri", "selfiana.putri@student.sch.id", "Rakhmad Putri", "+62 812 1111 0076", "rakhmad.putri@gmail.com"},
	{"STU077", "Thoriq Aziz", "thoriq.aziz@student.sch.id", "Miftah Aziz", "+62 812 1111 0077", "miftah.aziz@gmail.com"},
	{"STU078", "Uswatun Hasanah", "uswatun.hasanah@student.sch.id", "Khoiruddin Hasanah", "+62 812 1111 0078", "khoiruddin.hasanah@gmail.com"},
	{"STU079", "Vicky Ardian", "vicky.ardian@student.sch.id", "Subagyo Ardian", "+62 812 1111 0079", "subagyo.ardian@gmail.com"},
	{"STU080", "Widya Astuti", "widya.astuti@student.sch.id", "Ponimin Astuti", "+62 812 1111 0080", "ponimin.astuti@gmail.com"},
	{"STU081", "Xander Mahendra", "xander.mahendra@student.sch.id", "Kusnan Mahendra", "+62 812 1111 0081", "kusnan.mahendra@gmail.com"},
	{"STU082", "Yola Febriana", "yola.febriana@student.sch.id", "Sutomo Febriana", "+62 812 1111 0082", "sutomo.febriana@gmail.com"},
	{"STU083", "Zaki Mubarok", "zaki.mubarok@student.sch.id", "Ridwan Mubarok", "+62 812 1111 0083", "ridwan.mubarok@gmail.com"},
	{"STU084", "Andika Setiawan", "andika.setiawan@student.sch.id", "Heri Setiawan", "+62 812 1111 0084", "heri.setiawan@gmail.com"},
	{"STU085", "Bunga Melati", "bunga.melati@student.sch.id", "Sugianto Melati", "+62 812 1111 0085", "sugianto.melati@gmail.com"},
	{"STU086", "Chandra Pratama", "chandra.pratama@student.sch.id", "Wahono Pratama", "+62 812 1111 0086", "wahono.pratama@gmail.com"},
	{"STU087", "Dinda Arisanti", "dinda.arisanti@student.sch.id", "Sumarno Arisanti", "+62 812 1111 0087", "sumarno.arisanti@gmail.com"},
	{"STU088", "Edwin Julianto", "edwin.julianto@student.sch.id", "Bambang Julianto", "+62 812 1111 0088", "bambang.julianto@gmail.com"},
	{"STU089", "Farida Hanum", "farida.hanum@student.sch.id", "Sariman Hanum", "+62 812 1111 0089", "sariman.hanum@gmail.com"},
	{"STU090", "Gerry Susanto", "gerry.susanto@student.sch.id", "Tukijo Susanto", "+62 812 1111 0090", "tukijo.susanto@gmail.com"},
	{"STU091", "Hesti Pramudita", "hesti.pramudita@student.sch.id", "Mulyadi Pramudita", "+62 812 1111 0091", "mulyadi.pramudita@gmail.com"},
	{"STU092", "Ivan Gunawan", "ivan.gunawan@student.sch.id", "Budi Gunawan", "+62 812 1111 0092", "budi.gunawan@gmail.com"},
	{"STU093", "Julita Handayani", "julita.handayani@student.sch.id", "Suhadi Handayani", "+62 812 1111 0093", "suhadi.handayani@gmail.com"},
	{"STU094", "Kharisma Dewi", "kharisma.dewi@student.sch.id", "Sudirman Dewi", "+62 812 1111 0094", "sudirman.dewi@gmail.com"},
	{"STU095", "Lutfi Ardana", "lutfi.ardana@student.sch.id", "Sukirno Ardana", "+62 812 1111 0095", "sukirno.ardana@gmail.com"},
	{"STU096", "Melinda Sari", "melinda.sari@student.sch.id", "Suyitno Sari", "+62 812 1111 0096", "suyitno.sari@gmail.com"},
	{"STU097", "Nando Kurniadi", "nando.kurniadi@student.sch.id", "Pardi Kurniadi", "+62 812 1111 0097", "pardi.kurniadi@gmail.com"},
	{"STU098", "Okky Pramana", "okky.pramana@student.sch.id", "Legiman Pramana", "+62 812 1111 0098", "legiman.pramana@gmail.com"},
	{"STU099", "Prita Mahardhika", "prita.mahardhika@student.sch.id", "Gunadi Mahardhika", "+62 812 1111 0099", "gunadi.mahardhika@gmail.com"},
	{"STU100", "Raka Daniswara", "raka.daniswara@student.sch.id", "Purnomo Daniswara", "+62 812 1111 0100", "purnomo.daniswara@gmail.com"},
}

func seed(ctx context.Context, cmd *cli.Command) error {
	cfg, db, err := loadDB(cmd)
	if err != nil {
		return err
	}

	jwtSecret := cfg.Auth.JWTSecret
	if jwtSecret == "" {
		jwtSecret = "change-me-in-production"
	}

	authSvc := auth_service.New(db, jwtSecret)
	userSvc := user_service.New(db, cfg.Storage.UploadsDir)

	// ── Accounts ──────────────────────────────────────────────────────────────
	slog.Info("seeding accounts...")
	for _, a := range seedAccounts {
		_, err := authSvc.CreateAccount(ctx, connect.NewRequest(&authv1.CreateAccountRequest{
			Username:    a.username,
			DisplayName: a.displayName,
			Password:    a.password,
			Role:        a.role,
		}))
		if err != nil {
			slog.Info("account skipped (already exists)", "username", a.username)
			continue
		}
		slog.Info("account created", "username", a.username, "role", a.role)
	}

	// ── Students ──────────────────────────────────────────────────────────────
	slog.Info("seeding students...", "total", len(seedStudents))
	created, skipped := 0, 0
	for _, s := range seedStudents {
		_, err := userSvc.RegisterUser(ctx, connect.NewRequest(&usersv1.RegisterUserRequest{
			StudentId:   s.studentID,
			Name:        s.name,
			Email:       s.email,
			ParentName:  s.parentName,
			ParentPhone: s.parentPhone,
			ParentEmail: s.parentEmail,
		}))
		if err != nil {
			skipped++
			continue
		}
		created++
	}
	slog.Info("students seeded", "created", created, "skipped", skipped)

	slog.Info("seed completed")
	return nil
}
